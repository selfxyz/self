import { slate200, slate500 } from "../../utils/colors";
import AbstractButton, {ButtonProps} from "./AbstractButton";


export function SecondaryButton({children, ...props}: ButtonProps) {
    return (
        <AbstractButton {...props} bgColor={slate200} color={slate500}>{children}</AbstractButton>
    );
}