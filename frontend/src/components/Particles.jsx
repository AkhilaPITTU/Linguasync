import "./Particles.css";

function Particles(){

    const particles=[...Array(25)];

    return(

        <div className="particles">

            {particles.map((_,index)=>

                <span
                    key={index}
                    style={{

                        left:`${Math.random()*100}%`,

                        animationDelay:`${Math.random()*10}s`,

                        animationDuration:`${12+Math.random()*10}s`

                    }}
                />

            )}

        </div>

    )

}

export default Particles;