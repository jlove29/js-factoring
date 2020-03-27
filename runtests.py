from subprocess import call
import csv


def main():
    with open('worldgen/rules.csv') as infile:
        reader = csv.reader(infile)
        for row in reader:
            rules = row[0]
            islatch = row[1]
            actions = row[2]
            call(['node', 'basic.js', rules, islatch])
            return

main()
