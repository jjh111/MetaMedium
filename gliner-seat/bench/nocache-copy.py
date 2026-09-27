"""Copy files without leaving them in the OS file cache (macOS F_NOCACHE).

A cold load means the weights come off the disk, not out of memory. Evicting a
file from the cache takes `sudo purge`; writing a fresh copy with caching off
does not. bench/node.mjs copies the model this way before each disk-cold load
and checks the trick held by timing a first read against a second.

    python3 bench/nocache-copy.py <dest dir> <file> [<file> ...]
"""
import fcntl
import os
import sys

F_NOCACHE = getattr(fcntl, "F_NOCACHE", 48)
CHUNK = 8 << 20


def copy(src, dst):
    with open(src, "rb", buffering=0) as fi, open(dst, "wb", buffering=0) as fo:
        fcntl.fcntl(fi.fileno(), F_NOCACHE, 1)
        fcntl.fcntl(fo.fileno(), F_NOCACHE, 1)
        while True:
            block = fi.read(CHUNK)
            if not block:
                break
            fo.write(block)
        os.fsync(fo.fileno())


def main():
    dest = sys.argv[1]
    os.makedirs(dest, exist_ok=True)
    for src in sys.argv[2:]:
        copy(src, os.path.join(dest, os.path.basename(src)))


if __name__ == "__main__":
    main()
