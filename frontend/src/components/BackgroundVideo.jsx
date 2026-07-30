import "./BackgroundVideo.css";

function BackgroundVideo() {

    return (

        <>
            <video
                autoPlay
                muted
                loop
                playsInline
                className="bg-video"
            >

                <source
                    src="/videos/background.mp4"
                    type="video/mp4"
                />

            </video>

            <div className="bg-overlay"></div>

        </>

    );

}

export default BackgroundVideo;
