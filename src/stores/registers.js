import { writable } from 'svelte/store';

function createMutableStore(initialValue) {
    const subscribers = new Set();
    let value = initialValue;

    return {
        subscribe(run) {
            subscribers.add(run);
            run(value);
            return () => subscribers.delete(run);
        },
        set(newValue) {
            value = newValue;
            subscribers.forEach(sub => sub(value));
        },
        update(fn) {
            value = fn(value);
            subscribers.forEach(sub => sub(value));
        }
    };
}

export const registers = createMutableStore([]);
export const rawRegisters = createMutableStore([]);
export const registerConfigs = writable([]); // Configs change less often, standard writable is fine, or use mutable for consistency? 
// Configs are usually replaced entirely by a new array from the worker, so reference changes. Standard writable is ok.

