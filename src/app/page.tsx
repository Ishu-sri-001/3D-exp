import Image from "next/image";
// import InfiniteGridImg from '@/components/Grid';
import ThreeJSInfiniteGrid from '@/components/InfiniteGridGL';

export default function Home() {
  return (
    <div>
     {/* <InfiniteGridImg /> */}
     <ThreeJSInfiniteGrid />
    </div>
  );
}
