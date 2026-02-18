import { Composition } from "remotion";
import { MRIPromoVideo } from "./compositions/MRIPromoVideo";
import { VisionRadiologyBrandVideo } from "./compositions/VisionRadiologyBrandVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VisionRadiologyBrand"
        component={VisionRadiologyBrandVideo}
        durationInFrames={750} // 25 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          titleText: "Excellence In Radiology",
          subtitleText: "Your trusted partner in diagnostic imaging",
        }}
      />
      <Composition
        id="MRIPromo"
        // @ts-expect-error - Remotion composition type issue with FC<MRIPromoProps>
        component={MRIPromoVideo}
        durationInFrames={450} // 15 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          titleText: "Advanced MRI Imaging",
          subtitleText: "State-of-the-art technology for precise diagnostics",
        }}
      />
    </>
  );
};
