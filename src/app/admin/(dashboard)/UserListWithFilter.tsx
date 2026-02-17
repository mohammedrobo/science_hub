'use client';

import { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UserActions } from './UserActions';

interface User {
    username: string;
    full_name: string;
    access_role: 'student' | 'leader' | 'admin' | 'super_admin';
    original_group?: string;
}

interface UserListWithFilterProps {
    users: User[];
    selectedSection: string;
    isSuperAdmin: boolean;
}

function RoleBadge({ role }: { role: string }) {
    switch (role) {
        case 'super_admin':
            return <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/50">Super Admin</Badge>;
        case 'admin':
            return <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/50">Admin</Badge>;
        case 'leader':
            return <Badge className="bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border-violet-500/50">Leader</Badge>;
        default:
            return <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">Student</Badge>;
    }
}

export function UserListWithFilter({ users, selectedSection, isSuperAdmin }: UserListWithFilterProps) {
    const [filter, setFilter] = useState('');

    const filteredUsers = useMemo(() => {
        if (!filter.trim()) return users;
        const q = filter.toLowerCase();
        return users.filter(u =>
            u.full_name.toLowerCase().includes(q) ||
            u.username.toLowerCase().includes(q)
        );
    }, [users, filter]);

    return (
        <>
            {/* Inline Filter */}
            {users.length > 0 && (
                <div className="px-4 sm:px-6 pt-4 pb-2">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Filter by name..."
                            className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50"
                        />
                        {filter && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <span className="text-xs text-zinc-500">{filteredUsers.length}/{users.length}</span>
                                <button onClick={() => setFilter('')} className="text-zinc-500 hover:text-zinc-300">
                                    <Filter className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {filteredUsers.length === 0 && filter ? (
                <div className="text-center py-12 text-zinc-500">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No students match &quot;{filter}&quot; in Section {selectedSection}</p>
                </div>
            ) : (
                <>
                    {/* Mobile Card View */}
                    <div className="block lg:hidden space-y-2 p-2 sm:p-4">
                        {filteredUsers.map((user) => (
                            <div key={user.username} className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50 hover:border-zinc-600/50 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <div className="min-w-0">
                                            <p className="text-white font-medium text-sm truncate">{user.full_name}</p>
                                            <p className="text-zinc-500 text-xs truncate">
                                                @{user.username}
                                                {user.original_group && (
                                                    <span className="ml-1.5 text-zinc-600">· Group {user.original_group}</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        <RoleBadge role={user.access_role} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-end mt-3 pt-2 border-t border-zinc-700/50">
                                    <div className="flex gap-1">
                                        <UserActions
                                            username={user.username}
                                            fullName={user.full_name}
                                            currentRole={user.access_role}
                                            isSuperAdmin={isSuperAdmin}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-zinc-900 z-[1]">
                                <tr className="border-b border-zinc-800">
                                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Student Name</th>
                                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Username</th>
                                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm w-[80px]">Group</th>
                                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm w-[100px]">Role</th>
                                    <th className="text-right py-3 px-4 text-zinc-400 font-medium text-sm w-[200px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user, i) => (
                                    <tr key={user.username} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${i % 2 === 0 ? 'bg-zinc-900/30' : ''}`}>
                                        <td className="py-3 px-4">
                                            <span className="text-white font-medium">{user.full_name}</span>
                                        </td>
                                        <td className="py-3 px-4 text-zinc-400">@{user.username}</td>
                                        <td className="py-3 px-4">
                                            {user.original_group && (
                                                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{user.original_group}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <RoleBadge role={user.access_role} />
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <UserActions
                                                    username={user.username}
                                                    fullName={user.full_name}
                                                    currentRole={user.access_role}
                                                    isSuperAdmin={isSuperAdmin}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </>
    );
}
