import { memo, useEffect } from "react";
import { NavLink } from "react-router-dom";

function ExploreProvince({province}) {
    //const municipalities = useMemo(()=> getMunicipalitiesPerProvince, []);

    useEffect(()=> {
        console.log(province);
    }, []);

    return (
        <div>
            <NavLink to={`/explore/${province.code}`}>
                <h4>{province.name}</h4>
            </NavLink>
        </div>
    );
}

export default memo(ExploreProvince);
