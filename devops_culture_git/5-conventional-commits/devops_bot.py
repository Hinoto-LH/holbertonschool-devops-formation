#!/usr/bin/env python3
"""A tiny DevOps maintenance bot."""


def bot_status(name, energy):
    if energy > 100:
        energy = 100
    elif energy < 0:
        energy = 0
    return f"{name} is online with {energy}% energy"

def deploy():
    return "Deployment started"


if __name__ == "__main__":
    print(bot_status("HolbieBot", 100))
    print(deploy())