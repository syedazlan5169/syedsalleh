<?php

use Illuminate\Support\Facades\Auth;
use Livewire\Volt\Component;

new class extends Component {
    //
}; ?>

<div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
        <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 sm:p-12 text-center shadow-lg">
            <div class="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-6">
                <svg class="w-10 h-10 sm:w-12 sm:h-12 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
            <flux:heading size="xl" class="mb-3 text-neutral-900 dark:text-neutral-100">{{ __('Account Pending Approval') }}</flux:heading>
            <flux:text class="text-neutral-600 dark:text-neutral-400 mb-6 text-sm sm:text-base leading-relaxed">
                {{ __('Thank you for registering! Your account is pending admin approval. You will be able to access the dashboard once an administrator approves your account.') }}
            </flux:text>
            <div class="space-y-3">
                <div class="flex items-center gap-3 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div class="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {{ strtoupper(substr(Auth::user()->name, 0, 1)) }}
                    </div>
                    <div class="flex-1 text-left">
                        <flux:text class="font-semibold text-neutral-900 dark:text-neutral-100">{{ ucwords(strtolower(Auth::user()->name)) }}</flux:text>
                        <flux:text class="text-sm text-neutral-600 dark:text-neutral-400">{{ Auth::user()->email }}</flux:text>
                    </div>
                </div>
                <form method="POST" action="{{ route('logout') }}" class="pt-4">
                    @csrf
                    <flux:button type="submit" variant="ghost" class="w-full text-sm sm:text-base">
                        {{ __('Log Out') }}
                    </flux:button>
                </form>
            </div>
        </div>
    </div>
</div>
