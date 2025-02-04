#include <iostream>
#include <chrono>
#include "witnesscalc.h"
#include "filemaploader.hpp"

#define handle_error(msg) \
           do { perror(msg); exit(EXIT_FAILURE); } while (0)

void writeBinWitness(char *witnessBuffer, unsigned long witnessSize, std::string wtnsFileName)
{
    FILE *write_ptr;
    write_ptr = fopen(wtnsFileName.c_str(),"wb");

    if (write_ptr == NULL) {
        std::string msg("Could not open ");
        msg += wtnsFileName + " for write";
        throw std::system_error(errno, std::generic_category(), msg);
    }

    fwrite(witnessBuffer, witnessSize, 1, write_ptr);
    fclose(write_ptr);
}

static const size_t WitnessBufferSize = 4*1024*1024;
static char WitnessBuffer[WitnessBufferSize];

int main (int argc, char *argv[]) {

    std::string cl(argv[0]);

    if (argc!=3) {
        std::cout << "Usage: " << cl << " <input.json> <output.wtns>\n";
        return EXIT_FAILURE;
    }

    try {
        std::string datfile = cl + ".dat";
        std::string jsonfile(argv[1]);
        std::string wtnsFileName(argv[2]);

        size_t witnessSize = sizeof(WitnessBuffer);
        char   errorMessage[256];

        FileMapLoader jsonLoader(jsonfile);

        int error = CIRCUIT_NAME::witnesscalc_from_dat_file(datfile.c_str(),
                                jsonLoader.buffer, jsonLoader.size,
                                WitnessBuffer, &witnessSize,
                                errorMessage, sizeof(errorMessage));

        if (error == WITNESSCALC_ERROR_SHORT_BUFFER) {

            std::cerr << "Error: Short buffer for witness."
                      << " It should " << witnessSize << " bytes at least." << '\n';
            return EXIT_FAILURE;
        }
        else if (error) {

            std::cerr << errorMessage << '\n';
            return EXIT_FAILURE;
        }

        writeBinWitness(WitnessBuffer, witnessSize, wtnsFileName);

    } catch (std::exception* e) {
        std::cerr << e->what() << '\n';
        return EXIT_FAILURE;

    } catch (std::exception& e) {
        std::cerr << e.what() << '\n';
        return EXIT_FAILURE;
    }

    return EXIT_SUCCESS;
}

