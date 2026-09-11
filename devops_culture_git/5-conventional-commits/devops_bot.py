#!/usr/bin/env python3
"""A tiny DevOps maintenance bot."""


def validate_energy(energy):
    if energy > 100:
        return 100
    if energy < 0:
        return 0
    return energy


def bot_status(name, energy):
    energy = validate_energy(energy)
    return f"{name} is online with {energy}% energy"

def deploy():
    return "Deployment started"


if __name__ == "__main__":
    print(bot_status("HolbieBot", 100))
    print(deploy())