import csv

with open('out.txt', 'r') as infile:
    lines = infile.readlines()

worlds = []
with open('worldgen/rules.csv', 'r') as incsv:
    reader = csv.reader(incsv)
    for line in reader:
        worlds.append(line)

with open('mismatches.csv', 'a') as outcsv:
    writer = csv.writer(outcsv)
    for i in range(len(lines)):
        if lines[i][:-1] == '0':
            writer.writerow(worlds[i])

