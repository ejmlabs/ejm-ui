#!/bin/sh
# A tiny program for the tests: prints colors and a few non-ASCII glyphs, then exits. It needs none of the products.
printf '\033[31mred\033[0m \033[1;32mbold green\033[0m \033[4munderline\033[0m\n'
printf '\033[38;5;208m256-color orange\033[0m \033[38;2;10;20;30mtruecolor\033[0m \033[7minverse\033[0m\n'
printf 'glyphs: \302\267 \342\200\272 \342\224\200\342\224\200 \342\200\246\n'
printf 'size: '; stty size
