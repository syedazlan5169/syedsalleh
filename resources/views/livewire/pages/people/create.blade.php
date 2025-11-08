<?php

use Illuminate\Support\Facades\Auth;
use Livewire\Volt\Component;

new class extends Component
{
    public string $name = '';

    public string $nric = '';

    public string $date_of_birth = '';

    public string $gender = 'Male';

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
        // First 6 digits: YYMMDD, 8th digit (index 7): gender indicator
        if (strlen($nric) >= 8 && ctype_digit($nric)) {
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

            // Extract gender from 8th digit (index 7): even = Male, odd = Female
            $genderDigit = (int) substr($nric, 7, 1);
            $this->gender = ($genderDigit % 2 === 0) ? 'Male' : 'Female';
        }
    }

    public function store(): void
    {
        $validated = $this->validate([
            'name' => ['required', 'string', 'max:255'],
            'nric' => ['required', 'string', 'max:255', 'unique:people,nric'],
            'date_of_birth' => ['required', 'date'],
            'gender' => ['required', 'string', 'in:Male,Female'],
            'occupation' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
        ]);

        // Convert empty strings to null for optional fields
        $validated['occupation'] = empty($validated['occupation']) ? null : $validated['occupation'];
        $validated['address'] = empty($validated['address']) ? null : $validated['address'];
        $validated['phone'] = empty($validated['phone']) ? null : $validated['phone'];
        $validated['email'] = empty($validated['email']) ? null : $validated['email'];

        $person = Auth::user()->people()->create($validated);

        $this->redirect(route('people.index'), navigate: true);
    }
}; ?>

<div class="flex h-full w-full flex-1 flex-col gap-4">
        <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold">{{ __('Add Person') }}</h1>
            <flux:button href="{{ route('people.index') }}" variant="ghost">
                {{ __('Back') }}
            </flux:button>
        </div>

        <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
            <form wire:submit="store" class="space-y-6">
                <flux:input wire:model="name" :label="__('Name')" type="text" required autofocus />
                
                <flux:input wire:model.live="nric" :label="__('NRIC')" type="text" required />
                
                <flux:input wire:model="date_of_birth" :label="__('Date of Birth')" type="date" required />
                
                <flux:select wire:model="gender" :label="__('Gender')" required>
                    <option value="Male">{{ __('Male') }}</option>
                    <option value="Female">{{ __('Female') }}</option>
                </flux:select>
                
                <flux:input wire:model="occupation" :label="__('Occupation')" type="text" />
                
                <flux:textarea wire:model="address" :label="__('Address')" />
                
                <flux:input wire:model="phone" :label="__('Phone')" type="tel" />
                
                <flux:input wire:model="email" :label="__('Email')" type="email" />

                <div class="flex items-center gap-4">
                    <flux:button type="submit" variant="primary">
                        {{ __('Create') }}
                    </flux:button>
                    <flux:button href="{{ route('people.index') }}" variant="ghost" type="button">
                        {{ __('Cancel') }}
                    </flux:button>
                </div>
            </form>
        </div>
    </div>
</div>
