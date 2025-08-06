import elliptic from 'elliptic';
import hash from 'hash.js';

export function initElliptic(): typeof elliptic {
  const curves = elliptic.curves;
  const PresetCurve = elliptic.curves.PresetCurve;

  function defineCurve(name: string, options: any) {
    Object.defineProperty(curves, name, {
      configurable: true,
      enumerable: true,
      get: function () {
        const curve = new PresetCurve(options);
        Object.defineProperty(curves, name, {
          configurable: true,
          enumerable: true,
          value: curve,
        });
        return curve;
      },
    });
  }

  defineCurve('brainpoolP224r1', {
    type: 'short',
    prime: null,
    p: 'd7c134aa 26436686 2a183025 75d1d787 b09f0757 97da89f5 7ec8c0ff',
    a: '68a5e62c a9ce6c1c 299803a6 c1530b51 4e182ad8 b0042a59 cad29f43',
    b: '2580f63c cfe44138 870713b1 a92369e3 3e2135d2 66dbb372 386c400b',
    n: 'd7c134aa 26436686 2a183025 75d0fb98 d116bc4b 6ddebca3 a5a7939f',
    hash: hash.sha1,
    gRed: false,
    g: [
      '0d9029ad 2c7e5cf4 340823b2 a87dc68c 9e4ce317 4c1e6efd ee12c07d',
      '58aa56f7 72c0726f 24c6b89e 4ecdac24 354b9e99 caa3f6d3 761402cd',
    ],
  });

  defineCurve('brainpoolP256r1', {
    type: 'short',
    prime: null,
    p: 'a9fb57db a1eea9bc 3e660a90 9d838d72 6e3bf623 d5262028 2013481d 1f6e5377',
    a: '7d5a0975 fc2c3057 eef67530 417affe7 fb8055c1 26dc5c6c e94a4b44 f330b5d9',
    b: '26dc5c6c e94a4b44 f330b5d9 bbd77cbf 95841629 5cf7e1ce 6bccdc18 ff8c07b6',
    n: 'a9fb57db a1eea9bc 3e660a90 9d838d71 8c397aa3 b561a6f7 901e0e82 974856a7',
    hash: hash.sha256,
    gRed: false,
    g: [
      '8bd2aeb9 cb7e57cb 2c4b482f fc81b7af b9de27e1 e3bd23c2 3a4453bd 9ace3262',
      '547ef835 c3dac4fd 97f8461a 14611dc9 c2774513 2ded8e54 5c1d54c7 2f046997',
    ],
  });

  defineCurve('brainpoolP384r1', {
    type: 'short',
    prime: null,
    p: '8cb91e82 a3386d28 0f5d6f7e 50e641df 152f7109 ed5456b4 12b1da19 7fb71123 acd3a729 901d1a71 87470013 3107ec53',
    a: '7bc382c6 3d8c150c 3c72080a ce05afa0 c2bea28e 4fb22787 139165ef ba91f90f 8aa5814a 503ad4eb 04a8c7dd 22ce2826',
    b: '04a8c7dd 22ce2826 8b39b554 16f0447c 2fb77de1 07dcd2a6 2e880ea5 3eeb62d5 7cb43902 95dbc994 3ab78696 fa504c11',
    n: '8cb91e82 a3386d28 0f5d6f7e 50e641df 152f7109 ed5456b3 1f166e6c ac0425a7 cf3ab6af 6b7fc310 3b883202 e9046565',
    hash: hash.sha384,
    gRed: false,
    g: [
      '1d1c64f0 68cf45ff a2a63a81 b7c13f6b 8847a3e7 7ef14fe3 db7fcafe 0cbd10e8 e826e034 36d646aa ef87b2e2 47d4af1e',
      '8abe1d75 20f9c2a4 5cb1eb8e 95cfd552 62b70b29 feec5864 e19c054f f9912928 0e464621 77918111 42820341 263c5315',
    ],
  });

  defineCurve('brainpoolP512r1', {
    type: 'short',
    prime: null,
    p: 'aadd9db8 dbe9c48b 3fd4e6ae 33c9fc07 cb308db3 b3c9d20e d6639cca 70330871 7d4d9b00 9bc66842 aecda12a e6a380e6 2881ff2f 2d82c685 28aa6056 583a48f3',
    a: '7830a331 8b603b89 e2327145 ac234cc5 94cbdd8d 3df91610 a83441ca ea9863bc 2ded5d5a a8253aa1 0a2ef1c9 8b9ac8b5 7f1117a7 2bf2c7b9 e7c1ac4d 77fc94ca',
    b: '3df91610 a83441ca ea9863bc 2ded5d5a a8253aa1 0a2ef1c9 8b9ac8b5 7f1117a7 2bf2c7b9 e7c1ac4d 77fc94ca dc083e67 984050b7 5ebae5dd 2809bd63 8016f723',
    n: 'aadd9db8 dbe9c48b 3fd4e6ae 33c9fc07 cb308db3 b3c9d20e d6639cca 70330870 553e5c41 4ca92619 41866119 7fac1047 1db1d381 085ddadd b5879682 9ca90069',
    hash: hash.sha512,
    gRed: false,
    g: [
      '81aee4bd d82ed964 5a21322e 9c4c6a93 85ed9f70 b5d916c1 b43b62ee f4d0098e ff3b1f78 e2d0d48d 50d1687b 93b97d5f 7c6d5047 406a5e68 8b352209 bcb9f822',
      '7dde385d 566332ec c0eabfa9 cf7822fd f209f700 24a57b1a a000c55b 881f8111 b2dcde49 4a5f485e 5bca4bd8 8a2763ae d1ca2b2f a8f05406 78cd1e0f 3ad80892',
    ],
  });

  return elliptic;
}
