import React, { useState } from 'react'
import { AnimatePresence } from '@tamagui/animate-presence'
import { ArrowLeft, ArrowRight, Nfc, ShieldCheck } from '@tamagui/lucide-icons'
import { Button, Image, XStack, YStack, styled, Text } from 'tamagui'
import { bgBlue, bgGreen, borderColor, textBlack, textColor1, textColor2 } from '../utils/colors'
import CustomButton from './CustomButton'

const GalleryItem = styled(YStack, {
    zIndex: 1,
    x: 0,
    opacity: 1,
    fullscreen: true,

    variants: {
        going: {
            ':number': (going) => ({
                enterStyle: {
                    x: going > 0 ? 1000 : -1000,
                    opacity: 0,
                },
                exitStyle: {
                    zIndex: 0,
                    x: going < 0 ? 1000 : -1000,
                    opacity: 0,
                },
            }),
        },
    } as const,
})

const wrap = (min: number, max: number, v: number) => {
    const rangeSize = max - min
    return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min
}

interface CarouselProps {
    images: string[];
    height?: number;
    onSlideChange?: (index: number) => void;
    handleNfcScan?: () => void;
}

export function Carousel({ images, height = 300, onSlideChange, handleNfcScan }: CarouselProps) {
    const [[page, going], setPage] = useState([0, 0])

    const imageIndex = wrap(0, images.length, page)
    const paginate = (going: number) => {
        const newPage = page + going
        setPage([newPage, going])
        onSlideChange?.(newPage)
    }

    const isLastImage = imageIndex === images.length - 1
    const slideTexts = [
        { header: "Follow this guide carefully", subtitle: "", acknowledgment: "I'm ready to start" },
        { header: "Remove your phone case", subtitle: "If your phone does not have a case, you can skip this step.", acknowledgment: "I have removed my phone case" },
        { header: "Open your passport to the last page", subtitle: "", acknowledgment: "I have opened my passport to the last page" },
        { header: "Put your phone on the passport", subtitle: "Press your phone against the last page of the passport as in the image.", acknowledgment: "I have placed my phone on the passport" },
        { header: "Start scanning", subtitle: "Press Start NFC Scan and follow the on-screen instructions.", acknowledgment: "Start scanning" },
    ]

    const currentSlide = slideTexts[imageIndex] || { header: "No header", subtitle: "No subtitle for this slide", acknowledgment: "Continue" }

    return (
        <YStack f={1} >

            <XStack
                overflow="hidden"
                backgroundColor="#000"
                position="relative"
                height={height}
                alignItems="center"
                borderRadius="$10"
                mt="$5"
            >
                <AnimatePresence initial={false} custom={{ going }}>
                    <GalleryItem key={page} animation="medium" going={going}>
                        <Image source={{ uri: images[imageIndex] }} height={height} resizeMode="contain" />
                    </GalleryItem>
                </AnimatePresence>


                {imageIndex > 0 && (
                    <Button
                        icon={ArrowLeft}
                        size="$5"
                        position="absolute"
                        left="$4"
                        circular
                        elevate
                        onPress={() => paginate(-1)}
                        zi={100}
                    />
                )}
            </XStack>

            <YStack ml="$2">
                <Text fontSize="$8" mt="$4" color={textBlack} textAlign='center'>{currentSlide.header}</Text>
                <Text color={textBlack} fontSize="$5" mt="$2" textAlign='center' style={{ opacity: 0.7 }} fontStyle='italic'>{currentSlide.subtitle}</Text>
            </YStack>

            {/* <XStack justifyContent='center' alignItems='center' gap="$1.5" position="absolute" style={{ bottom: 120, left: 0, right: 0 }}>
                <ShieldCheck color={textBlack} size={14} />
                <Text color={textBlack} fontSize="$4" >private and secured</Text>
            </XStack> */}
            <XStack f={1} />

            <CustomButton
                onPress={isLastImage ? () => handleNfcScan?.() : () => paginate(+1)}
                text={currentSlide.acknowledgment}
                Icon={isLastImage ? <Nfc /> : undefined}
                blueVariant={!isLastImage}
            />
        </YStack>
    )
}