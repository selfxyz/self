"""This is a simple and fast ASN1 decoder without external libraries.

In order to browse through the ASN1 structure you need only 3
functions allowing you to navigate:
   asn1_node_root(...), asn1_node_next(...) and asn1_node_first_child(...)
"""
####################### BEGIN ASN1 DECODER ############################

# Author: Jens Getreu, 8.11.2014

# NAVIGATE

# The following 4 functions are all you need to parse an ASN1 structure


def asn1_node_root(der):
    """gets the first ASN1 structure in der"""
    return asn1_read_length(der, 0)


def asn1_node_next(der, indices):
    """gets the next ASN1 structure following (ixs,ixf,ixl)"""
    ixs, ixf, ixl = indices
    return asn1_read_length(der, ixl + 1)


def asn1_node_first_child(der, indices):
    """opens the container (ixs,ixf,ixl) and returns the first ASN1 inside"""
    ixs, ixf, ixl = indices
    if der[ixs] & 0x20 != 0x20:
        raise ValueError(
            "Error: can only open constructed types. " + "Found type: " + hex(der[ixs])
        )
    return asn1_read_length(der, ixf)


def asn1_node_is_child_of(i_indices, j_indices):
    """is true if one ASN1 chunk is inside another chunk."""
    ixs, ixf, ixl = i_indices
    jxs, jxf, jxl = j_indices
    # print(f"(({ixf} <= {jxs}) and ({jxl} <= {ixl}) or (({jxf} <= {ixs}) and ({ixl} <= {jxl}))");
    return ((ixf <= jxs) and (jxl < ixl)) or ((jxf <= ixs) and (ixl < jxl))


# END NAVIGATE


# ACCESS PRIMITIVES
def asn1_get_value_of_type(der, indices, asn1_type):
    """get content and verify type byte"""
    ixs, ixf, ixl = indices
    asn1_type_table = {
        "BOOLEAN": 0x01,
        "INTEGER": 0x02,
        "BIT STRING": 0x03,
        "OCTET STRING": 0x04,
        "NULL": 0x05,
        "OBJECT IDENTIFIER": 0x06,
        "SEQUENCE": 0x70,
        "SET": 0x71,
        "PrintableString": 0x13,
        "IA5String": 0x16,
        "UTCTime": 0x17,
        "ENUMERATED": 0x0A,
        "UTF8String": 0x0C,
    }
    if asn1_type_table[asn1_type] != der[ixs]:
        raise ValueError(
            "Error: Expected type was: "
            + hex(asn1_type_table[asn1_type])
            + " Found: "
            + hex(der[ixs])
        )
    return der[ixf : ixl + 1]


def asn1_get_value(der, indices):
    """get value"""
    ixs, ixf, ixl = indices
    return der[ixf : ixl + 1]


def asn1_get_all(der, indices):
    """get type+length+value"""
    ixs, ixf, ixl = indices
    return der[ixs : ixl + 1]


# END ACCESS PRIMITIVES


# HELPER FUNCTIONS
def bitstr_to_bytes(bitstr):
    """converts bitstring to bytes"""
    if bitstr[0] != 0x00:
        raise ValueError("Error: only 00 padded bitstr can be converted to bytestr!")
    return bitstr[1:]


def bytestr_to_int(s):
    """converts bytes to integer"""
    return int.from_bytes(s, byteorder="big")


def asn1_read_length(der, ix):
    """
    ix points to the first byte of the asn1 structure
    Returns first byte pointer, first content byte pointer and last.
    """
    first = der[ix + 1]
    if der[ix + 1] & 0x80 == 0:
        length = first
        ix_first_content_byte = ix + 2
        ix_last_content_byte = ix_first_content_byte + length - 1
    else:
        lengthbytes = first & 0x7F
        length = bytestr_to_int(der[ix + 2 : ix + 2 + lengthbytes])
        ix_first_content_byte = ix + 2 + lengthbytes
        ix_last_content_byte = ix_first_content_byte + length - 1
    return (ix, ix_first_content_byte, ix_last_content_byte)


# END HELPER FUNCTIONS

####################### END ASN1 DECODER ############################
