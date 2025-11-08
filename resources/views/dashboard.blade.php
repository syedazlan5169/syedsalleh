<x-layouts.app :title="__('Dashboard')">
    <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-6">
        <div class="px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
            <h1 class="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">{{ __('Dashboard') }}</h1>
            <p class="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">{{ __('Welcome back! Manage your family members and documents.') }}</p>
        </div>
        
        <div class="px-4 sm:px-6">
            <div class="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <a href="{{ route('people.index') }}" wire:navigate class="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-full -mr-16 -mt-16"></div>
                    <div class="relative">
                        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg">
                            <svg class="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                        </div>
                        <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('My People') }}</flux:heading>
                        <flux:text class="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                            {{ __('Manage your family members') }}
                        </flux:text>
                    </div>
                </a>

                <a href="{{ route('people.all') }}" wire:navigate class="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 hover:shadow-lg transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-700">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-600/10 rounded-full -mr-16 -mt-16"></div>
                    <div class="relative">
                        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                            <svg class="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                        <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('All People') }}</flux:heading>
                        <flux:text class="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                            {{ __('Browse all people in the system') }}
                        </flux:text>
                    </div>
                </a>

                <a href="{{ route('people.create') }}" wire:navigate class="group relative overflow-hidden rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 sm:p-8 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-200 sm:col-span-2 lg:col-span-1">
                    <div class="relative text-center">
                        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-4 mx-auto shadow-lg">
                            <svg class="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                        </div>
                        <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('Add Person') }}</flux:heading>
                        <flux:text class="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                            {{ __('Add a new family member') }}
                        </flux:text>
                    </div>
                </a>
            </div>
        </div>
    </div>
</x-layouts.app>
