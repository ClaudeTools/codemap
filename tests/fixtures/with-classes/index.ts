/**
 * Class hierarchy test fixture
 */

export abstract class Animal {
  constructor(public name: string) {}

  abstract speak(): string;

  move(distance: number): string {
    return `${this.name} moved ${distance} meters`;
  }
}

export class Dog extends Animal {
  constructor(name: string, public breed: string) {
    super(name);
  }

  speak(): string {
    return `${this.name} barks!`;
  }

  fetch(): string {
    return `${this.name} fetches the ball`;
  }
}

export class Cat extends Animal {
  constructor(name: string, public indoor: boolean) {
    super(name);
  }

  speak(): string {
    return `${this.name} meows!`;
  }

  scratch(): string {
    return `${this.name} scratches the furniture`;
  }
}

export interface Pet {
  name: string;
  owner?: string;
}

export type AnimalType = 'dog' | 'cat' | 'bird';
