import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, Html, Center, Float } from '@react-three/drei';
import * as THREE from 'three';

// Fix for "Property does not exist on type JSX.IntrinsicElements"
// We explicitly define the used elements to ensure TypeScript recognizes them
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      planeGeometry: any;
      meshStandardMaterial: any;
      group: any;
      cylinderGeometry: any;
      ambientLight: any;
      spotLight: any;
      pointLight: any;
      gridHelper: any;
      // HTML elements used in this component
      div: any;
      span: any;
    }
  }
}

interface ThreeDViewerProps {
  resultImageUrl: string;
  clothTextureUrl?: string | null;
  mode: 'scene' | 'model';
}

// Component to display the 2D Try-On result in 3D space
const ResultPlane: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const texture = useTexture(imageUrl) as THREE.Texture;
  texture.colorSpace = THREE.SRGBColorSpace;
  const img = texture.image as HTMLImageElement;
  
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh rotation={[0, 0, 0]}>
        <planeGeometry args={[3, 3 * (img.height / img.width)]} />
        <meshStandardMaterial 
          map={texture} 
          side={THREE.DoubleSide} 
          transparent={true}
          roughness={0.4}
        />
      </mesh>
    </Float>
  );
};

// Component to display the generated 3D Clothing Model
const ClothingModel: React.FC<{ textureUrl: string }> = ({ textureUrl }) => {
  const texture = useTexture(textureUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);

  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle auto-rotation
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group>
      {/* Stylized Mannequin / Torso shape */}
      <mesh ref={meshRef} position={[0, 0, 0]} scale={[1, 1, 0.6]}>
        {/* Cylinder with height segments for better lighting */}
        <cylinderGeometry args={[0.8, 0.7, 2.5, 64, 10]} />
        <meshStandardMaterial 
          map={texture} 
          roughness={0.6}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Simple stand */}
      <mesh position={[0, -2.0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1.5, 32]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, -2.8, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.1, 32]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};

export const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ resultImageUrl, clothTextureUrl, mode }) => {
  return (
    <div className="w-full h-[500px] bg-slate-900 rounded-xl overflow-hidden relative shadow-2xl border border-slate-700">
      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium flex items-center border border-white/10">
        <span className={`w-2 h-2 rounded-full mr-2 ${mode === 'scene' ? 'bg-blue-500' : 'bg-green-500'} animate-pulse`}></span>
        {mode === 'scene' ? 'Interactive Result View' : '3D Generated Model'}
      </div>
      
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <Suspense fallback={
          <Html center>
            <div className="flex flex-col items-center justify-center text-white">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
              <div className="text-xs font-bold tracking-wider uppercase">Loading 3D Assets</div>
            </div>
          </Html>
        }>
          <ambientLight intensity={0.7} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          
          <Center>
            {mode === 'scene' ? (
              <ResultPlane imageUrl={resultImageUrl} />
            ) : (
              clothTextureUrl && <ClothingModel textureUrl={clothTextureUrl} />
            )}
          </Center>
          
          <OrbitControls 
            minDistance={3} 
            maxDistance={12}
            autoRotate={false} 
          />
          
          {/* Environment Grid */}
          <gridHelper args={[30, 30, 0x333333, 0x111111]} position={[0, -3, 0]} />
        </Suspense>
      </Canvas>
    </div>
  );
};