import { amber50, slate300, black, white } from "../../utils/colors";
import AbstractButton, {ButtonProps} from "./AbstractButton";

export function PrimaryButton({children, ...props}: ButtonProps) {
    const isDisabled = props.disabled
    const bgColor = isDisabled ? white : black
    const color = isDisabled ?  slate300 : amber50
    return (
        <AbstractButton {...props} bgColor={bgColor} color={color}>{children}</AbstractButton>
    );
}   