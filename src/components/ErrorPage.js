import { useParams, useNavigate, NavLink } from "react-router-dom";
import { BiError } from "react-icons/bi";

function ErrorPage() {
    const parms = useParams();
    const navigate = useNavigate();

    return (
        <div className='w3-panel w3-win8-crimson w3-padding'>
            <h3><BiError/>Error!</h3>
            <p>{parms.message}</p>
            <NavLink onClick={()=> navigate(-1)}>Go back</NavLink>
        </div>
    );
}

export default ErrorPage;
