import React, { useMemo } from 'react';
import { Svg, Rect } from 'react-native-svg';
import { YStack } from 'tamagui';

interface ProofGridProps {
    proof: { proof: string; inputs: string } | null;
}

const ProofGrid: React.FC<ProofGridProps> = ({ proof }) => {
    const gridSize = 8;
    const pixelSize = 15;

    const sumAndScaleDigits = useMemo(() => (values: string[]) => {
        const sum = values.reduce((acc, val) => acc + BigInt(val), BigInt(0));
        const digits = sum.toString().split('').map(Number);
        return digits.map(digit => Math.round(digit * (256 / 9)));
    }, []);

    // Prepare the RGB values
    const { rValues, gValues, bValues } = useMemo(() => {
        if (!proof) {
            return { rValues: [], gValues: [], bValues: [] };
        }

        const parsedProof = JSON.parse(proof.proof);
        return {
            rValues: sumAndScaleDigits(parsedProof.a),
            gValues: sumAndScaleDigits(parsedProof.b.flat()),
            bValues: sumAndScaleDigits(parsedProof.c)
        };
    }, [proof, sumAndScaleDigits]);

    // Generate the grid data
    const gridData = useMemo(() =>
        Array.from({ length: gridSize }, (_, rowIndex) =>
            Array.from({ length: gridSize }, (_, colIndex) => {
                const index = rowIndex * gridSize + colIndex;
                const r = index < rValues.length ? rValues[index] : 0;
                const g = index < gValues.length ? gValues[index] : 0;
                const b = index < bValues.length ? bValues[index] : 0;
                return `rgb(${r}, ${g}, ${b})`;
            })
        )
        , [gridSize, rValues, gValues, bValues]);

    // Render the grid using SVG and Rect
    return (
        <YStack
            width={gridSize * pixelSize}
            borderRadius={40}
            overflow="hidden"
            elevation="$4"
            style={{ backdropFilter: 'blur(10px)' }}
        >
            <Svg height={gridSize * pixelSize} width={gridSize * pixelSize} >
                {gridData.map((row, i) =>
                    row.map((fill, j) => (
                        <Rect
                            key={`${i}-${j}`}
                            x={j * pixelSize}
                            y={i * pixelSize}
                            width={pixelSize}
                            height={pixelSize}
                            fill={fill}
                        />
                    ))
                )}
            </Svg>
        </YStack>

    );
};

export default ProofGrid;
