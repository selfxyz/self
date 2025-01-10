// utils from snarkjs copied here before snarkjs imports node crypto

function unstringifyBigInts(o: any): any {
  if (typeof o === 'string' && /^[0-9]+$/.test(o)) {
    return BigInt(o);
  } else if (typeof o === 'string' && /^0x[0-9a-fA-F]+$/.test(o)) {
    return BigInt(o);
  } else if (Array.isArray(o)) {
    return o.map(unstringifyBigInts);
  } else if (typeof o === 'object') {
    if (o === null) {
      return null;
    }
    const res: any = {};
    const keys = Object.keys(o);
    keys.forEach(k => {
      res[k] = unstringifyBigInts(o[k]);
    });
    return res;
  } else {
    return o;
  }
}

function p256(n: any) {
  let nstr = n.toString(16);
  while (nstr.length < 64) {
    nstr = '0' + nstr;
  }
  nstr = `"0x${nstr}"`;
  return nstr;
}

export default function groth16ExportSolidityCallData(_proof: any, _pub: any) {
  const proof = unstringifyBigInts(_proof);
  const pub = unstringifyBigInts(_pub);

  let inputs = '';
  for (let i = 0; i < pub.length; i++) {
    if (inputs !== '') {
      inputs = inputs + ',';
    }
    inputs = inputs + p256(pub[i]);
  }

  const S =
    `[${p256(proof.a[0])}, ${p256(proof.a[1])}],` +
    `[[${p256(proof.b[0][1])}, ${p256(proof.b[0][0])}],[${p256(
      proof.b[1][1],
    )}, ${p256(proof.b[1][0])}]],` +
    `[${p256(proof.c[0])}, ${p256(proof.c[1])}],` +
    `[${inputs}]`;

  return S;
}
