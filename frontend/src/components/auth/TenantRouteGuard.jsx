import React, { useEffect, useState } from "react";
import { useParams, Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { axiosClient } from "../../api/axiosClient";
import { HospitalNotFoundPage } from "../../pages/HospitalNotFoundPage";

// Cache verified domains in memory so we only hit the API once per session
export const verifiedDomainCache = new Set();
export const notFoundDomainCache = new Set();

export const TenantRouteGuard = ({ children, allowedRoles = [] }) => {
  const { hospitalDomain } = useParams();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  // If domain is already cached as verified, skip the API call immediately
  const alreadyVerified = !hospitalDomain || verifiedDomainCache.has(hospitalDomain?.toLowerCase());
  const alreadyNotFound = hospitalDomain && notFoundDomainCache.has(hospitalDomain?.toLowerCase());

  const [domainVerified, setDomainVerified] = useState(alreadyVerified);
  const [domainNotFound, setDomainNotFound] = useState(alreadyNotFound);
  const [verifyingDomain, setVerifyingDomain] = useState(!alreadyVerified && !alreadyNotFound && !!hospitalDomain);

  useEffect(() => {
    if (!hospitalDomain) {
      setVerifyingDomain(false);
      setDomainVerified(true);
      return;
    }

    const domainKey = hospitalDomain.toLowerCase();

    // Already cached — skip API call
    if (verifiedDomainCache.has(domainKey)) {
      setDomainVerified(true);
      setVerifyingDomain(false);
      return;
    }
    if (notFoundDomainCache.has(domainKey)) {
      setDomainNotFound(true);
      setVerifyingDomain(false);
      return;
    }

    let isMounted = true;
    setVerifyingDomain(true);

    axiosClient
      .get(`/saas/hospitals/by-domain/${hospitalDomain}`)
      .then(() => {
        if (!isMounted) return;
        verifiedDomainCache.add(domainKey);
        setDomainVerified(true);
        setDomainNotFound(false);
        setVerifyingDomain(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        const status = err?.response?.status || err?.status;
        if (status === 404 || err?.error?.code === "HOSPITAL_NOT_FOUND") {
          // Only mark as not found on explicit 404
          notFoundDomainCache.add(domainKey);
          setDomainNotFound(true);
        } else {
          // Any other error (502, network error, timeout) — assume domain is valid
          // and allow navigation through. Backend may be temporarily down.
          verifiedDomainCache.add(domainKey);
          setDomainVerified(true);
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

