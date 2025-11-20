<?php

use App\Models\User;
use App\Models\Person;
use App\Models\Document;
use Illuminate\Support\Facades\Auth;
use Livewire\Volt\Component;

new class extends Component {
    public function mount(): void
    {
        abort_unless(Auth::user()->isAdmin(), 403);
    }
}; ?>

<div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-6">
    <div class="px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
        <h1 class="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">{{ __('Admin Dashboard') }}</h1>
        <p class="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">{{ __('Manage users, people, documents, and system settings.') }}</p>
    </div>
    
    <div class="px-4 sm:px-6">
        @php
            $totalUsers = User::count();
            $totalAdmins = User::where('is_admin', true)->count();
            $totalApprovedUsers = User::whereNotNull('approved_at')->count();
            $pendingUsers = User::whereNull('approved_at')->where('is_admin', false)->count();
            $totalPeople = Person::count();
            $totalDocuments = Document::count();
            $publicDocuments = Document::where('is_public', true)->count();
            $privateDocuments = Document::where('is_public', false)->count();
            
            $usersThisMonth = User::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();
            $peopleThisMonth = Person::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();
            $documentsThisMonth = Document::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();
            
            $recentUsers = User::latest()->limit(5)->get();
        @endphp

        <!-- Statistics Cards -->
        <div class="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
            <!-- Total Users -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <div class="flex items-center justify-between mb-2">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                    </div>
                    <span class="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{{ __('This month') }}: +{{ $usersThisMonth }}</span>
                </div>
                <div class="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">{{ $totalUsers }}</div>
                <div class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">{{ __('Total Users') }}</div>
                <div class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {{ $totalAdmins }} {{ __('admins') }}, {{ $pendingUsers }} {{ __('pending') }}
                </div>
            </div>

            <!-- Pending Approvals -->
            <a href="{{ route('admin.users') }}" wire:navigate class="rounded-2xl border border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200">
                <div class="flex items-center justify-between mb-2">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                        <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <svg class="w-4 h-4 text-orange-500 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </div>
                <div class="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">{{ $pendingUsers }}</div>
                <div class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">{{ __('Pending Approvals') }}</div>
            </a>

            <!-- Total People -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <div class="flex items-center justify-between mb-2">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                    </div>
                    <span class="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{{ __('This month') }}: +{{ $peopleThisMonth }}</span>
                </div>
                <div class="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">{{ $totalPeople }}</div>
                <div class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">{{ __('Total People') }}</div>
            </div>

            <!-- Total Documents -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <div class="flex items-center justify-between mb-2">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                        <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                    <span class="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{{ __('This month') }}: +{{ $documentsThisMonth }}</span>
                </div>
                <div class="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">{{ $totalDocuments }}</div>
                <div class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">{{ __('Total Documents') }}</div>
                <div class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {{ $publicDocuments }} {{ __('public') }}, {{ $privateDocuments }} {{ __('private') }}
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="mb-6 sm:mb-8">
            <h2 class="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">{{ __('Quick Actions') }}</h2>
            <div class="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <a href="{{ route('admin.users') }}" wire:navigate class="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-full -mr-16 -mt-16"></div>
                    <div class="relative">
                        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg">
                            <svg class="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                            </svg>
                        </div>
                        <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('Manage Users') }}</flux:heading>
                        <flux:text class="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                            {{ __('Approve, reject, and manage user accounts') }}
                        </flux:text>
                    </div>
                </a>

                <a href="{{ route('admin.suggestions') }}" wire:navigate class="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 hover:shadow-lg transition-all duration-200 hover:border-yellow-300 dark:hover:border-yellow-700">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-orange-600/10 rounded-full -mr-16 -mt-16"></div>
                    <div class="relative">
                        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center mb-4 shadow-lg">
                            <svg class="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                            </svg>
                        </div>
                        <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('View Suggestions') }}</flux:heading>
                        <flux:text class="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                            {{ __('Review and manage user suggestions') }}
                        </flux:text>
                    </div>
                </a>

                <a href="{{ route('admin.activity') }}" wire:navigate class="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 hover:shadow-lg transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-700">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-600/10 rounded-full -mr-16 -mt-16"></div>
                    <div class="relative">
                        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                            <svg class="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('Activity Log') }}</flux:heading>
                        <flux:text class="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                            {{ __('View system activity and logs') }}
                        </flux:text>
                    </div>
                </a>
            </div>
        </div>

        <!-- Recent Users -->
        @if($recentUsers->isNotEmpty())
            <div class="mb-6 sm:mb-8">
                <h2 class="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">{{ __('Recent Users') }}</h2>
                <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
                    <div class="divide-y divide-neutral-200 dark:divide-neutral-800">
                        @foreach($recentUsers as $user)
                            <div class="p-4 sm:p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                <div class="flex items-center gap-4">
                                    <div class="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg">
                                        {{ strtoupper(substr($user->name, 0, 1)) }}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-1">
                                            <flux:heading size="base" class="font-bold text-neutral-900 dark:text-neutral-100">
                                                {{ ucwords(strtolower($user->name)) }}
                                            </flux:heading>
                                            @if($user->isAdmin())
                                                <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    {{ __('Admin') }}
                                                </span>
                                            @endif
                                            @if($user->isApproved())
                                                <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    {{ __('Approved') }}
                                                </span>
                                            @else
                                                <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                                    {{ __('Pending') }}
                                                </span>
                                            @endif
                                        </div>
                                        <div class="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                                            {{ $user->email }}
                                        </div>
                                        <div class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                            {{ __('Joined') }} {{ $user->created_at->diffForHumans() }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        @endforeach
                    </div>
                </div>
            </div>
        @endif

        <!-- System Overview -->
        <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">{{ __('System Overview') }}</h2>
            <div class="grid gap-4 sm:grid-cols-2">
                <div>
                    <div class="text-sm text-neutral-600 dark:text-neutral-400 mb-1">{{ __('User Statistics') }}</div>
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-neutral-600 dark:text-neutral-400">{{ __('Total Users') }}</span>
                            <span class="font-semibold text-neutral-900 dark:text-neutral-100">{{ $totalUsers }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-neutral-600 dark:text-neutral-400">{{ __('Admins') }}</span>
                            <span class="font-semibold text-neutral-900 dark:text-neutral-100">{{ $totalAdmins }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-neutral-600 dark:text-neutral-400">{{ __('Approved Users') }}</span>
                            <span class="font-semibold text-green-600 dark:text-green-400">{{ $totalApprovedUsers }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-neutral-600 dark:text-neutral-400">{{ __('Pending Approvals') }}</span>
                            <span class="font-semibold text-orange-600 dark:text-orange-400">{{ $pendingUsers }}</span>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="text-sm text-neutral-600 dark:text-neutral-400 mb-1">{{ __('Content Statistics') }}</div>
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-neutral-600 dark:text-neutral-400">{{ __('Total People') }}</span>
                            <span class="font-semibold text-neutral-900 dark:text-neutral-100">{{ $totalPeople }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-neutral-600 dark:text-neutral-400">{{ __('Total Documents') }}</span>
                            <span class="font-semibold text-neutral-900 dark:text-neutral-100">{{ $totalDocuments }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-neutral-600 dark:text-neutral-400">{{ __('Public Documents') }}</span>
                            <span class="font-semibold text-green-600 dark:text-green-400">{{ $publicDocuments }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-neutral-600 dark:text-neutral-400">{{ __('Private Documents') }}</span>
                            <span class="font-semibold text-neutral-600 dark:text-neutral-400">{{ $privateDocuments }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

