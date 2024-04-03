#ifndef WITNESSCALC_INTERNAL_H
#define WITNESSCALC_INTERNAL_H

#include <sys/stat.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>
#include <string>
#include <iostream>

class FileMapLoader
{
public:
    explicit FileMapLoader(const std::string &datFileName)
    {
        int fd;
        struct stat sb;

        fd = open(datFileName.c_str(), O_RDONLY);
        if (fd == -1) {
            std::cout << ".dat file not found: " << datFileName << "\n";
            throw std::system_error(errno, std::generic_category(), "open");
        }

        if (fstat(fd, &sb) == -1) {          /* To obtain file size */
            close(fd);
            throw std::system_error(errno, std::generic_category(), "fstat");
        }

        size =  sb.st_size;
        buffer = (char*)mmap(NULL, size, PROT_READ , MAP_PRIVATE, fd, 0);
        close(fd);
    }

    ~FileMapLoader()
    {
        munmap(buffer, size);
    }

    FileMapLoader(const FileMapLoader&) = delete; // Delete the copy constructor
    FileMapLoader& operator=(const FileMapLoader&) = delete; // Delete the copy assignment operator

    char   *buffer;
    size_t  size;
};

#endif //WITNESSCALC_INTERNAL_H
