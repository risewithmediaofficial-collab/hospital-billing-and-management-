import React from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/Button";

export const HospitalNotFoundPage = ({ domain }) => {
  const params = useParams();
  const targetDomain = domain || params.hospitalDomain || "Unknown Domain";

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-3xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={32} />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight mb-2 text-white">
          Hospital Not Found
        </h1>

        <p className="text-sm text-slate-400 mb-6">
          The hospital portal at{" "}
          <span className="font-mono font-bold text-red-400">/{targetDomain}</span>{" "}
          does not exist or may have been removed.
        </p>

        <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/60 text-xs text-slate-300 mb-6 text-left space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <Building2 size={14} /> Please verify the hospital URL slug
          </div>
          <p className="text-slate-400">
            Check the spelling of your hospital domain name in the address bar (e.g. <span className="text-indigo-400 font-mono">/hospital-name/login</span>).
          </p>
        </div>

        <div className="space-y-3">
          <Link to="/register-hospital" className="block">
            <Button variant="primary" className="w-full font-bold">
              Register New Hospital
            </Button>
          </Link>
          <Link to="/login" className="block">
            <Button variant="ghost" className="w-full text-slate-400 hover:text-white flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Platform Admin Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
