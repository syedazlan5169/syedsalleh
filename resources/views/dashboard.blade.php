<x-layouts.app :title="__('Dashboard')">
    <div class="flex h-full w-full flex-1 flex-col gap-4">
        <h1 class="text-2xl font-bold">{{ __('Dashboard') }}</h1>
        
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <a href="{{ route('people.index') }}" wire:navigate class="group rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors">
                <flux:heading size="lg" class="mb-2">{{ __('My People') }}</flux:heading>
                <flux:text class="text-neutral-500 dark:text-neutral-400">
                    {{ __('Manage your family members') }}
                </flux:text>
            </a>

            <a href="{{ route('people.all') }}" wire:navigate class="group rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors">
                <flux:heading size="lg" class="mb-2">{{ __('All People') }}</flux:heading>
                <flux:text class="text-neutral-500 dark:text-neutral-400">
                    {{ __('Browse all people in the system') }}
                </flux:text>
            </a>

            <a href="{{ route('people.create') }}" wire:navigate class="group rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors">
                <flux:heading size="lg" class="mb-2">{{ __('Add Person') }}</flux:heading>
                <flux:text class="text-neutral-500 dark:text-neutral-400">
                    {{ __('Add a new family member') }}
                </flux:text>
            </a>
        </div>
    </div>
</x-layouts.app>
