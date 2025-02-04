#include "witnesscalc_vc_and_disclose.h"
#include "witnesscalc.h"

int witnesscalc_vc_and_disclose(
    const char *circuit_buffer, unsigned long circuit_size,
    const char *json_buffer, unsigned long json_size,
    char *wtns_buffer, unsigned long *wtns_size,
    char *error_msg, unsigned long error_msg_maxsize)
{
    return CIRCUIT_NAME::witnesscalc(circuit_buffer, circuit_size,
                                     json_buffer, json_size,
                                     wtns_buffer, wtns_size,
                                     error_msg, error_msg_maxsize);
}
