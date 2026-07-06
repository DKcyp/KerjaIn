"use client";

import Snowfall from "react-snowfall";

export default function SnowfallWrapper() {
    return (
        <Snowfall
            color="#dee4fd"
            snowflakeCount={120}
            radius={[0.5, 2.2]}
            style={{
                position: 'fixed',
                width: '100vw',
                height: '100vh',
                zIndex: 9999,
                pointerEvents: 'none'
            }}
        />
    );
}
