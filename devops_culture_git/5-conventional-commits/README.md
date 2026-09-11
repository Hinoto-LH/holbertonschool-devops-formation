# HolbieBot

A tiny DevOps maintenance bot.

## What it does

HolbieBot reports its status (name and energy level) and can start a
deployment. Energy is always kept within a valid range (0–100%).

## Requirements

- Python 3

## How to run the program

    python3 devops_bot.py

Expected output:

    HolbieBot is online with 100% energy
    Deployment started

## How to run the tests

    python3 -m unittest

All tests should pass.