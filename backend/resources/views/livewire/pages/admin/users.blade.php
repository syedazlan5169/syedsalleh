<?php

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Livewire\Volt\Component;

new class extends Component {
    public function mount(): void
    {
        abort_unless(Auth::user()->isAdmin(), 403);
    }

    public function approve(User $user): void
    {
        abort_unless(Auth::user()->isAdmin(), 403);
        
        $user->update(['approved_at' => now()]);
        
        $this->dispatch('user-approved');
    }

    public function reject(User $user): void
    {
        abort_unless(Auth::user()->isAdmin(), 403);
        
        $user->delete();
        
        $this->dispatch('user-rejected');
    }
}; ?>

<div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-6">
    <div class="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-6">
        <div class="flex items-center justify-between">
            <h1 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{{ __('User Approvals') }}</h1>
            <flux:button href="{{ route('dashboard') }}" variant="ghost" size="sm" class="text-sm sm:text-base">
                {{ __('Back') }}
            </flux:button>
        </div>
    </div>

    <div class="px-4 sm:px-6 pt-4 sm:pt-6">
        @php
            $pendingUsers = User::whereNull('approved_at')->where('is_admin', false)->latest()->get();
        @endphp

        @if ($pendingUsers->isEmpty())
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 sm:p-12 text-center shadow-sm">
                <div class="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 sm:w-10 sm:h-10 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('No pending approvals') }}</flux:heading>
                <flux:text class="text-neutral-500 dark:text-neutral-400 text-sm sm:text-base">
                    {{ __('All users have been approved.') }}
                </flux:text>
            </div>
        @else
            <div class="space-y-3 sm:space-y-4">
                @foreach ($pendingUsers as $user)
                    <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                        <div class="flex items-start gap-4">
                            <div class="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg">
                                {{ strtoupper(substr($user->name, 0, 1)) }}
                            </div>
                            <div class="flex-1 min-w-0">
                                <flux:heading size="base" class="font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                                    {{ ucwords(strtolower($user->name)) }}
                                </flux:heading>
                                <div class="space-y-1.5">
                                    <div class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                        </svg>
                                        <span class="truncate">{{ $user->email }}</span>
                                    </div>
                                    <div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span>{{ __('Registered') }} {{ $user->created_at->diffForHumans() }}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                                <flux:button wire:click="approve({{ $user->id }})" variant="primary" size="sm" class="text-sm w-full sm:w-auto">
                                    {{ __('Approve') }}
                                </flux:button>
                                <flux:button wire:click="reject({{ $user->id }})" 
                                    wire:confirm="{{ __('Are you sure you want to reject this user? This will delete their account.') }}"
                                    variant="ghost" 
                                    size="sm"
                                    class="text-sm w-full sm:w-auto text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                                    {{ __('Reject') }}
                                </flux:button>
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
        @endif
    </div>
</div>
