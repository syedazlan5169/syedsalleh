<?php

use Illuminate\Support\Facades\Auth;
use Livewire\Volt\Component;

new class extends Component
{
    public string $name = '';

    public string $nric = '';

    public string $date_of_birth = '';

    public string $gender = 'Male';

    public string $blood_type = '';

    public string $occupation = '';

    public string $address = '';

    public string $phone = '';

    public string $email = '';

    public function updatedNric(string $value): void
    {
        if (empty($value)) {
            return;
        }

        // Remove hyphens and spaces from NRIC
        $nric = preg_replace('/[-\s]/', '', $value);

        // Malaysian NRIC format: YYMMDD-PB-G### (12 digits)
        // First 6 digits: YYMMDD, last digit: gender indicator
        if (strlen($nric) >= 6 && ctype_digit($nric)) {
            // Extract date of birth (first 6 digits: YYMMDD)
            $yy = (int) substr($nric, 0, 2);
            $mm = substr($nric, 2, 2);
            $dd = substr($nric, 4, 2);

            // Determine century: 00-30 likely 2000-2030, 31-99 likely 1931-1999
            $year = $yy <= 30 ? 2000 + $yy : 1900 + $yy;

            // Validate date components
            if (checkdate((int) $mm, (int) $dd, $year)) {
                $this->date_of_birth = sprintf('%04d-%02d-%02d', $year, (int) $mm, (int) $dd);
            }

            // Extract gender from last digit: even = Female, odd = Male
            $lastDigit = (int) substr($nric, -1);
            $this->gender = ($lastDigit % 2 === 0) ? 'Female' : 'Male';
        }
    }

    public function store(): void
    {
        $validated = $this->validate([
            'name' => ['required', 'string', 'max:255'],
            'nric' => ['required', 'string', 'max:255', 'unique:people,nric'],
            'date_of_birth' => ['required', 'date'],
            'gender' => ['required', 'string', 'in:Male,Female'],
            'blood_type' => ['nullable', 'string', 'max:10'],
            'occupation' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
        ]);

        // Convert empty strings to null for optional fields
        $validated['blood_type'] = empty($validated['blood_type']) ? null : $validated['blood_type'];
        $validated['occupation'] = empty($validated['occupation']) ? null : $validated['occupation'];
        $validated['address'] = empty($validated['address']) ? null : $validated['address'];
        $validated['phone'] = empty($validated['phone']) ? null : $validated['phone'];
        $validated['email'] = empty($validated['email']) ? null : $validated['email'];

        $person = Auth::user()->people()->create($validated);

        $this->redirect(route('people.index'), navigate: true);
    }
}; ?>

<div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-6">
    <div class="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-6">
        <div class="flex items-center justify-between">
            <h1 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{{ __('Add Person') }}</h1>
            <flux:button href="{{ route('people.index') }}" variant="ghost" size="sm" class="text-sm sm:text-base">
                {{ __('Cancel') }}
            </flux:button>
        </div>
    </div>

    <div class="px-4 sm:px-6 pt-4 sm:pt-6 max-w-2xl mx-auto">
        <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 lg:p-8 shadow-sm">
            <form wire:submit="store" class="space-y-5 sm:space-y-6">
                <div class="grid gap-5 sm:gap-6">
                    <flux:input wire:model="name" :label="__('Name')" type="text" required autofocus class="text-base" />
                    
                    <flux:input wire:model.live="nric" :label="__('NRIC')" type="text" required class="text-base" />
                    
                    <div class="grid grid-cols-2 gap-4 sm:gap-5">
                        <flux:input wire:model="date_of_birth" :label="__('Date of Birth')" type="date" required class="text-base" />
                        
                        <flux:select wire:model="gender" :label="__('Gender')" required class="text-base">
                            <option value="Male">{{ __('Male') }}</option>
                            <option value="Female">{{ __('Female') }}</option>
                        </flux:select>
                    </div>
                    
                    <flux:select wire:model="blood_type" :label="__('Blood Type')" class="text-base">
                        <option value="">{{ __('Select blood type') }}</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                    </flux:select>
                    
                    <flux:input wire:model="occupation" :label="__('Occupation')" type="text" class="text-base" />
                    
                    <flux:textarea wire:model="address" :label="__('Address')" rows="3" class="text-base" />
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                        <flux:input wire:model="phone" :label="__('Phone')" type="tel" class="text-base" />
                        
                        <flux:input wire:model="email" :label="__('Email')" type="email" class="text-base" />
                    </div>
                </div>

                <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <flux:button href="{{ route('people.index') }}" variant="ghost" type="button" class="w-full sm:w-auto text-base">
                        {{ __('Cancel') }}
                    </flux:button>
                    <flux:button type="submit" variant="primary" class="w-full sm:w-auto text-base font-semibold">
                        {{ __('Create Person') }}
                    </flux:button>
                </div>
            </form>
        </div>
    </div>
</div>
