'use client';

import { signout } from '@/app/login/actions';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
    return (
        <button
            onClick={() => signout()}
            className="flex items-center w-full px-2 py-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
        >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
        </button>
    );
}
