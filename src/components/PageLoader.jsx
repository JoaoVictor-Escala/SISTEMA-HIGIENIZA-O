import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '400px',
      width: '100%',
      background: 'transparent',
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        padding: '20px',
        background: 'var(--white, #ffffff)',
        borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }} className="dark:bg-slate-800">
        <Loader2 size={28} className="animate-spin text-blue-600 dark:text-blue-500" />
      </div>
    </div>
  );
}
