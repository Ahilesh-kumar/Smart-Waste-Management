import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Neon material for the premium look
const NeonMaterial = ({ color = "#06b6d4", opacity = 0.8 }) => (
    <meshPhysicalMaterial
        color={color}
        metalness={0.8}
        roughness={0.2}
        transparent
        opacity={opacity}
        emissive={color}
        emissiveIntensity={0.5}
        clearcoat={1}
    />
);

const RoboticArm = ({ servos }) => {
    const baseRef = useRef();
    const arm1Ref = useRef();
    const arm2Ref = useRef();
    const gripperRef = useRef();

    // Convert degrees to radians
    const rad = (deg) => (deg * Math.PI) / 180;

    // S0: Base Rotation (0-180) -> Map to -90 to 90
    const baseRot = useMemo(() => rad(servos.find(s => s.id === 0)?.angle || 90) - Math.PI / 2, [servos]);
    // S1: Shoulder (0-180)
    const shoulderRot = useMemo(() => rad(servos.find(s => s.id === 1)?.angle || 90) - Math.PI / 2, [servos]);
    // S2: Elbow (0-180)
    const elbowRot = useMemo(() => rad(servos.find(s => s.id === 2)?.angle || 90) - Math.PI / 2, [servos]);
    // S3: Gripper (0-180) - Visualized as opening width or color
    const gripperState = (servos.find(s => s.id === 3)?.angle || 0);

    // Smooth animation using lerp would be better, but direct mapping for responsiveness first
    useFrame((state, delta) => {
        if (baseRef.current) {
            baseRef.current.rotation.y = THREE.MathUtils.lerp(baseRef.current.rotation.y, -baseRot, delta * 5);
        }
        if (arm1Ref.current) {
            arm1Ref.current.rotation.z = THREE.MathUtils.lerp(arm1Ref.current.rotation.z, shoulderRot, delta * 5);
        }
        if (arm2Ref.current) {
            arm2Ref.current.rotation.z = THREE.MathUtils.lerp(arm2Ref.current.rotation.z, elbowRot, delta * 5);
        }
    });

    return (
        <group position={[0, -2, 0]}>
            {/* Base Platform */}
            <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[2, 2.5, 0.4, 32]} />
                <NeonMaterial color="#0a0a0a" opacity={1} />
            </mesh>

            {/* Rotating Base (S0) */}
            <group ref={baseRef}>
                <mesh position={[0, 1, 0]}>
                    <cylinderGeometry args={[1.5, 1.5, 1.5, 32]} />
                    <NeonMaterial color="#10b981" />
                </mesh>

                {/* Arm Segment 1 (Shoulder - S1) */}
                <group position={[0, 1.5, 0]} ref={arm1Ref}>
                    <mesh position={[0, 1.5, 0]}>
                        <boxGeometry args={[0.8, 3.5, 0.8]} />
                        <NeonMaterial color="#06b6d4" />
                    </mesh>

                    {/* Joint Decor */}
                    <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.6, 0.6, 1.2, 32]} />
                        <meshStandardMaterial color="#ffffff" />
                    </mesh>

                    {/* Arm Segment 2 (Elbow - S2) */}
                    <group position={[0, 3.2, 0]} ref={arm2Ref}>
                        <mesh position={[0, 1.2, 0]}>
                            <boxGeometry args={[0.6, 2.8, 0.6]} />
                            <NeonMaterial color="#8b5cf6" />
                        </mesh>

                        {/* Elbow Joint Decor */}
                        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
                            <meshStandardMaterial color="#ffffff" />
                        </mesh>

                        {/* Gripper (Wrist - S3) */}
                        <group position={[0, 2.8, 0]}>
                            <mesh rotation={[0, 0, 0]}>
                                <boxGeometry args={[1, 0.4, 0.5]} />
                                <meshStandardMaterial color={gripperState > 90 ? "#f43f5e" : "#10b981"} />
                            </mesh>
                            <pointLight distance={3} intensity={2} color={gripperState > 90 ? "#f43f5e" : "#10b981"} />
                        </group>
                    </group>
                </group>
            </group>
        </group>
    );
};

export default function DigitalTwin({ servos, theme }) {
    return (
        <div className="w-full h-full min-h-[300px] relative rounded-2xl overflow-hidden bg-black/20">
            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[5, 5, 8]} fov={50} />
                <OrbitControls enablePan={false} enableZoom={true} minDistance={5} maxDistance={15} />

                {/* Cinematic Lighting */}
                <ambientLight intensity={0.2} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={10} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={1} color="#06b6d4" />

                <RoboticArm servos={servos} />

                <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.5} far={10} color="#000000" />
                <Environment preset="city" />
            </Canvas>

            {/* Overlay Badge */}
            <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-xs font-mono text-cyan-400">
                DIGITAL TWIN • ACTIVE
            </div>
        </div>
    );
}
