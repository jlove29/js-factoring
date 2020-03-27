import os
import sys


def main():
    if len(sys.argv) == 1:
        try:
            os.remove('mismatches.csv')
        except FileNotFoundError:
            pass
        try:
            os.remove('out.txt')
        except FileNotFoundError:
            pass
        try:
            os.remove('worldgen/rules.csv')
        except FileNotFoundError:
            pass
        return
    args = sys.argv[1:]
    if '-m' in args:
        try:
            os.remove('mismatches.csv')
        except FileNotFoundError:
            pass
    if '-o' in args:
        try:
            os.remove('out.txt')
        except FileNotFoundError:
            pass
    if '-r' in args:
        try:
            os.remove('worldgen/rules.csv')
        except FileNotFoundError:
            pass
    

    

main()
