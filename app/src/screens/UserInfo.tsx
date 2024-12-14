import React from 'react';
import { YStack, Text, XStack, Separator } from 'tamagui';
import useUserStore from '../stores/userStore';
import { textBlack, separatorColor } from '../utils/colors';
import { findSubarrayIndex } from '../../../common/src/utils/utils';
import { PassportData } from '../../../common/src/utils/types';
import { hash } from '../../../common/src/utils/utils';
import { parseCertificate } from '../../../common/src/utils/certificates/handleCertificate';

const UserInfo: React.FC = () => {
    const { passportData } = useUserStore();
    const { eContent, signedAttr, dg1Hash, dgPresents } = passportData as PassportData;
    const dg1HashOffset = dg1Hash ? findSubarrayIndex(eContent, dg1Hash.map(byte => byte > 127 ? byte - 256 : byte)) : undefined;

    const InfoRow = ({ label, value }: { label: string; value: string | number }) => (
        <XStack py="$2" justifyContent="space-between">
            <Text color={textBlack} fontSize="$5">{label}</Text>
            <Text color={textBlack} fontSize="$5">{value}</Text>
        </XStack>
    );

    function findHashSizeOfEContent(eContent: number[], signedAttr: number[]) {
        const allHashes = ['sha512', 'sha384', 'sha256', 'sha1'];
        for (const hashFunction of allHashes) {
            const hashValue = hash(hashFunction, eContent);
            const hashOffset = findSubarrayIndex(signedAttr, hashValue);
            if (hashOffset !== -1) {
                return { hashFunction, offset: hashOffset };
            }
        }
    }

    const { hashFunction: eContentHashFunction, offset: eContentHashOffset } = findHashSizeOfEContent(eContent, signedAttr) || { hashFunction: '', offset: 0 };
    const dscHashFunction = parseCertificate(passportData?.dsc || '').hashFunction;



    return (
        <YStack f={1} p="$0" gap="$2" jc="flex-start" mt="$10">
            <Text fontSize="$8" color={textBlack} mb="$4">Passport Data Info</Text>
            <Separator borderColor={separatorColor} />

            <InfoRow
                label="Data Groups"
                value={passportData?.dgPresents?.toString().split(',').map(item => item.replace('DG', '')).join(',') || 'None'}
            />
            <Separator borderColor={separatorColor} />

            <InfoRow
                label="DG1 Hash Size"
                value={`${passportData?.dg1Hash?.length || 0} ${passportData?.dg1Hash?.length === 32 ? '(sha256)' : passportData?.dg1Hash?.length === 20 ? '(sha1)' : passportData?.dg1Hash?.length === 48 ? '(sha384)' : passportData?.dg1Hash?.length === 64 ? '(sha512)' : ''}`}
            />
            <Separator borderColor={separatorColor} />
            <InfoRow
                label="DG1 Hash Offset"
                value={dg1HashOffset || 0}
            />
            <Separator borderColor={separatorColor} />

            <InfoRow
                label="eContent Size"
                value={passportData?.eContent?.length || 0}
            />
            <Separator borderColor={separatorColor} />
            <InfoRow
                label="eContent Hash Function"
                value={eContentHashFunction}
            />
            <Separator borderColor={separatorColor} />
            <InfoRow
                label="eContent Hash Offset"
                value={eContentHashOffset}
            />
            <Separator borderColor={separatorColor} />

            <InfoRow
                label="Signed Attributes Size"
                value={passportData?.signedAttr?.length || 0}
            />
            <Separator borderColor={separatorColor} />
            <InfoRow
                label="Signed Attributes Hash Function"
                value={dscHashFunction}
            />
        </YStack>
    );
};

export default UserInfo;
