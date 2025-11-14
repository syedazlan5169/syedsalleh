<?php

use App\Models\Person;
use App\Models\User;
use Livewire\Volt\Volt;

test('user can view their people', function () {
    $user = User::factory()->approved()->create();
    Person::factory()->count(3)->create(['user_id' => $user->id]);

    $this->actingAs($user);

    $this->get(route('people.index'))->assertOk();
});

test('user can create a person', function () {
    $user = User::factory()->approved()->create();

    $this->actingAs($user);

    $response = Volt::test('pages.people.create')
        ->set('name', 'John Doe')
        ->set('nric', '1234567890')
        ->set('date_of_birth', '1990-01-01')
        ->set('gender', 'Male')
        ->set('occupation', 'Engineer')
        ->set('address', '123 Main St')
        ->set('phone', '1234567890')
        ->set('email', 'john@example.com')
        ->call('store');

    $response->assertHasNoErrors();

    expect(Person::where('name', 'John Doe')->exists())->toBeTrue();
    expect(Person::where('name', 'John Doe')->first()->user_id)->toBe($user->id);
});

test('user can create a person with only required fields', function () {
    $user = User::factory()->approved()->create();

    $this->actingAs($user);

    $response = Volt::test('pages.people.create')
        ->set('name', 'Jane Doe')
        ->set('nric', '9876543210')
        ->set('date_of_birth', '1995-05-15')
        ->set('gender', 'Female')
        ->call('store');

    $response->assertHasNoErrors();

    $person = Person::where('name', 'Jane Doe')->first();
    expect($person)->not->toBeNull();
    expect($person->user_id)->toBe($user->id);
    expect($person->occupation)->toBeNull();
    expect($person->address)->toBeNull();
    expect($person->phone)->toBeNull();
    expect($person->email)->toBeNull();
});

test('user can view all people', function () {
    $user1 = User::factory()->approved()->create();
    $user2 = User::factory()->approved()->create();

    Person::factory()->create(['user_id' => $user1->id, 'name' => 'Person 1']);
    Person::factory()->create(['user_id' => $user2->id, 'name' => 'Person 2']);

    $this->actingAs($user1);

    $this->get(route('people.all'))->assertOk();
});

test('user can only edit their own people', function () {
    $user1 = User::factory()->approved()->create();
    $user2 = User::factory()->approved()->create();

    $person = Person::factory()->create(['user_id' => $user1->id]);

    $this->actingAs($user2);

    $this->get(route('people.edit', $person))->assertForbidden();
});

test('user can view any person profile', function () {
    $user1 = User::factory()->approved()->create();
    $user2 = User::factory()->approved()->create();

    $person = Person::factory()->create(['user_id' => $user1->id]);

    $this->actingAs($user2);

    $this->get(route('people.show', $person))->assertOk();
});

test('gender is autofilled from NRIC last digit - even is female, odd is male', function () {
    $user = User::factory()->approved()->create();

    $this->actingAs($user);

    // Test with even last digit (should be Female)
    $response = Volt::test('pages.people.create')
        ->set('nric', '900101123456'); // Last digit is 6 (even)

    $response->assertSet('gender', 'Female');

    // Test with odd last digit (should be Male)
    $response = Volt::test('pages.people.create')
        ->set('nric', '900101123457'); // Last digit is 7 (odd)

    $response->assertSet('gender', 'Male');
});
