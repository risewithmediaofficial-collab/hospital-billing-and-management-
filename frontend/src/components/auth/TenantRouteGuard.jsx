import React, { useEffect, useState } from "react";
import { useParams, Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { axiosClient } from "../../api/axiosClient";
import { HospitalNotFoundPage } from "../../pages/HospitalNotFoundPage";

export const TenantRouteGuard = ({ children, allowedRoles = [] }) => {
  const { hospitalDomain } = useParams();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  const [domainVerified, setDomainVerified] = useState(!hospitalDomain);
  const [domainNotFound, setDomainNotFound] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(!!hospitalDomain);

  useEffect(() => {
    if (!hospitalDomain) {
      setVerifyingDomain(false);
      setDomainVerified(true);
      return;
    }

    let isMounted = true;
    setVerifyingDomain(true);

    axiosClient
      .get(`/saas/hospitals/by-domain/${hospitalDomain}`)
      .then(() => {
        if (!isMounted) return;
        setDomainVerified(true);
        setDomainNotFound(false);
        setVerifyingDomain(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err?.response?.status === 404 || err?.status === 404 || err?.error?.code === "HOSPITAL_NOT_FOUND") {
          setDomainNotFound(true);
        }
        setVerifyingDomain(false);
      });

    return () => {
      isMounted = false;
    };
  }, [hospitalDomain]);

  if (isLoading || verifyingDomain) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-lg border border-slate-200 text-sm font-semibold text-slate-700">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Verifying Tenant Workspace...
        </div>
      </div>
    );
  }

  if (domainNotFound) {
    return <HospitalNotFoundPage domain={hospitalDomain} />;
  }

  if (!isAuthenticated || !user) {
    const loginTarget = hospitalDomain ? `/${hospitalDomain}/login` : "/login";
    return <Navigate to={loginTarget} state={{ from: location }} replace />;
  }

  // Super Admin global access allowed
  if (user.role === "SUPER_ADMIN") {
    return children ? children : <Outlet />;
  }

  // Cross-tenant protection: Check user's hospitalDomain against route hospitalDomain
  const userDomain = user.hospitalDomain || "";
  if (hospitalDomain && userDomain && hospitalDomain.toLowerCase() !== userDomain.toLowerCase()) {
    // Cross-tenant access denied! Redirect user to their own hospital portal
    const targetRoute = user.defaultRoute || `/${userDomain}/admin/dashboard`;
    return <Navigate to={targetRoute} replace />;
  }

  // Role validation — check primary role AND any additional roles
  const userAllRoles = [user.role, ...(Array.isArray(user.additionalRoles) ? user.additionalRoles : [])].filter(Boolean);
  if (allowedRoles.length > 0 && !allowedRoles.some((r) => userAllRoles.includes(r))) {
    return <Navigate to="/403" replace />;
  }

  return children ? children : <Outlet />;
};
