import React from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Package, Truck, ShoppingCart, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const InventoryDashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Central Supply Store & Inventory Management</h2>
        <p className="text-xs text-slate-400 mt-1">{user?.name || 'Inventory Manager'} — Central Stores Desk</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ward Indent Requests" value="0 Pending" subtitle="ICU & Ward Indents" icon={Truck} color="amber" />
        <StatCard title="Reorder Level Alerts" value="0 Items" subtitle="Low Stock Items" icon={AlertCircle} color="sky" />
        <StatCard title="Active Purchase Orders" value="0 POs" subtitle="Awaiting Vendor GRN" icon={ShoppingCart} color="purple" />
        <StatCard title="Total Asset Value" value="₹0.00" subtitle="Consumables & Assets" icon={Package} color="emerald" />
      </div>

      <Card>
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Truck size={18} className="text-amber-400" />
          Pending Ward Stock Indents
        </h3>
        <div className="p-8 text-center text-slate-500 text-sm">
          No pending ward indents found.
        </div>
      </Card>
    </div>
  );
};
