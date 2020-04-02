from subprocess import call
import csv


def main():
    with open('rules.csv') as infile:
        reader = csv.reader(infile)
        for row in reader:
            rules = row[0]
            actions = row[1]
            islatch = row[2]
            call(['node', '../basic.js', rules, actions, islatch])

main()
