import Image from 'next/image';
import styles from './page.module.css';
import skeleton from './skeleton.gif';

export default function HomePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 overflow-hidden">
            <div className="text-center mb-10">
                <h1 className={styles.rotatingTitle}>Identity Verified!</h1>
            </div>

            <div className="text-center">
                <Image
                    src={skeleton} // Place your GIF in the public folder
                    alt="Loading animation"
                    width={300}
                    height={300}
                    priority
                />
            </div>
        </div>
    );
}