<?php

use App\Models\Person;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Livewire\Volt\Component;

new class extends Component {
    public Person $person;
    
    public string $name = '';
    public string $nric = '';
    public string $date_of_birth = '';
    public string $gender = 'Male';
    public string $occupation = '';
    public string $address = '';
    public string $phone = '';
    public string $email = '';

    public function mount(Person $person): void
    {
        abort_unless($person->user_id === Auth::id(), 403);
        
        $this->person = $person;
        $this->name = $person->name;
        $this->nric = $person->nric;
        $this->date_of_birth = $person->date_of_birth->format('Y-m-d');
        $this->gender = $person->gender;
        $this->occupation = $person->occupation;
        $this->address = $person->address;
        $this->phone = $person->phone;
        $this->email = $person->email;
    }

    public function update(): void
    {
        $validated = $this->validate([
            'name' => ['required', 'string', 'max:255'],
            'nric' => ['required', 'string', 'max:255', Rule::unique('people')->ignore($this->person->id)],
            'date_of_birth' => ['required', 'date'],
            'gender' => ['required', 'string', 'in:Male,Female'],
            'occupation' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:500'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        $this->person->update($validated);

        $this->redirect(route('people.index'), navigate: true);
    }
}; ?>

<div class="flex h-full w-full flex-1 flex-col gap-4">
        <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold">{{ __('Edit Person') }}</h1>
            <flux:button href="{{ route('people.index') }}" variant="ghost">
                {{ __('Back') }}
            </flux:button>
        </div>

        <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
            <form wire:submit="update" class="space-y-6">
                <flux:input wire:model="name" :label="__('Name')" type="text" required autofocus />
                
                <flux:input wire:model="nric" :label="__('NRIC')" type="text" required />
                
                <flux:input wire:model="date_of_birth" :label="__('Date of Birth')" type="date" required />
                
                <flux:select wire:model="gender" :label="__('Gender')" required>
                    <option value="Male">{{ __('Male') }}</option>
                    <option value="Female">{{ __('Female') }}</option>
                </flux:select>
                
                <flux:input wire:model="occupation" :label="__('Occupation')" type="text" required />
                
                <flux:textarea wire:model="address" :label="__('Address')" required />
                
                <flux:input wire:model="phone" :label="__('Phone')" type="tel" required />
                
                <flux:input wire:model="email" :label="__('Email')" type="email" required />

                <div class="flex items-center gap-4">
                    <flux:button type="submit" variant="primary">
                        {{ __('Update') }}
                    </flux:button>
                    <flux:button href="{{ route('people.index') }}" variant="ghost" type="button">
                        {{ __('Cancel') }}
                    </flux:button>
                </div>
            </form>
        </div>
    </div>
</div>
