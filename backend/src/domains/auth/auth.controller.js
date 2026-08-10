import { AuthService } from './auth.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const login = async (req, res, next) => {
  try {
    const { email, password, hospitalDomain, domain } = req.body;
    const domainSlug = hospitalDomain || domain || req.headers['x-hospital-domain'];
    const result = await AuthService.login(email, password, domainSlug);

    res.cookie('accessToken', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
    });

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Days
    });

    return sendSuccess(res, 200, 'Authentication successful', result);
  } catch (error) {
    next(error);
  }
};

export const patientLogin = async (req, res, next) => {
  try {
    const { mobileNumber, dob } = req.body;
    const result = await AuthService.patientLogin(mobileNumber, dob);

    res.cookie('accessToken', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return sendSuccess(res, 200, 'Patient authentication successful', result);
  } catch (error) {
    next(error);
  }
};

export const guardianLogin = async (req, res, next) => {
  try {
    const { guardianMobile, patientMobile, patientNumber } = req.body;
    const result = await AuthService.guardianLogin(guardianMobile, patientMobile, patientNumber);

    res.cookie('accessToken', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return sendSuccess(res, 200, 'Guardian authentication successful', result);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return sendSuccess(res, 200, 'Logged out successfully', null);
  } catch (error) {
    next(error);
  }
};

export const createStaffUser = async (req, res, next) => {
  try {
    const staff = await AuthService.createStaffUser(req.body, req.user);
    return sendSuccess(res, 201, 'Hospital staff account created successfully', staff);
  } catch (error) {
    next(error);
  }
};

export const getStaffPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminPassword } = req.body;
    const result = await AuthService.getStaffPassword(id, adminPassword, req.user);
    return sendSuccess(res, 200, 'Staff password retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const updateStaffPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword, adminPassword } = req.body;
    const result = await AuthService.updateStaffPassword(id, { newPassword, adminPassword }, req.user);
    return sendSuccess(res, 200, `Password for staff '${result.email}' updated successfully!`, result);
  } catch (error) {
    next(error);
  }
};

export const getHospitalStaff = async (req, res, next) => {
  try {
    const staff = await AuthService.getHospitalStaff(req.user);
    return sendSuccess(res, 200, 'Hospital staff retrieved successfully', staff);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const userProfile = await AuthService.getMe(req.user.id);
    return sendSuccess(res, 200, 'User profile fetched successfully', userProfile);
  } catch (error) {
    next(error);
  }
};

export const updateDoctorAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isAvailable, cabinNo } = req.body;
    const result = await AuthService.toggleDoctorAvailability(id, isAvailable, cabinNo, req.user);
    
    // Broadcast real-time availability and cabin change across branch and all clients
    const { socketManager } = await import('../../events/socketManager.js');
    if (result.branchId) {
      socketManager.emitToBranch(result.branchId, 'doctor:availability_changed', result);
    }
    if (socketManager.io) {
      socketManager.io.emit('doctor:availability_changed', result);
    }

    return sendSuccess(res, 200, `Doctor availability / cabin settings updated successfully`, result);
  } catch (error) {
    next(error);
  }
};

export const updateStaffPermissions = async (req, res, next) => {
  try {
    const staff = await AuthService.updateStaffPermissions(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Staff permissions updated successfully.', staff);
  } catch (error) { next(error); }
};

export const updateStaffUser = async (req, res, next) => {
  try {
    const staff = await AuthService.updateStaffUser(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Staff user updated successfully.', staff);
  } catch (error) { next(error); }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await AuthService.verifyEmail(token);
    return sendSuccess(res, 200, result.message, result);
  } catch (error) { next(error); }
};

export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await AuthService.resendVerification(email);
    return sendSuccess(res, 200, result.message, result);
  } catch (error) { next(error); }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await AuthService.forgotPassword(email);
    return sendSuccess(res, 200, result.message, result);
  } catch (error) { next(error); }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await AuthService.resetPassword(token, newPassword);
    return sendSuccess(res, 200, result.message, result);
  } catch (error) { next(error); }
};


