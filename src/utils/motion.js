export const easeOut = [0.22, 1, 0.36, 1];

export const springSoft = { type: "spring", stiffness: 380, damping: 32, mass: 0.8 };
export const springSnappy = { type: "spring", stiffness: 520, damping: 36, mass: 0.7 };

export const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
};

export const pageTransition = {
    duration: 0.34,
    ease: easeOut,
};

export const overlayTransition = {
    duration: 0.22,
    ease: easeOut,
};

export const tapPress = { scale: 0.97 };
export const hoverLift = { scale: 1.02, y: -1 };

export const staggerContainer = {
    hidden: { opacity: 1 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05, delayChildren: 0.04 },
    },
};

export const staggerItem = {
    hidden: { opacity: 0, y: 10 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.28, ease: easeOut },
    },
};

export const slideStep = {
    initial: { opacity: 0, x: 18 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -14 },
    transition: { duration: 0.28, ease: easeOut },
};
