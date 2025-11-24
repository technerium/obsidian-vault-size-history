import styled from "styled-components";
import {DialogActions, DialogContent} from "@mui/material";
import {SketchPicker} from "react-color";

const customStyle = 'var(--background-primary)'
const CustomDialogContent = styled(DialogContent)`
	  background-color: ${customStyle} !important;
	`;

const CustomDialogActions = styled(DialogActions)`
	  background-color: ${customStyle} !important;
	`;

const CustomSketchPicker = styled(SketchPicker)`
		background: ${customStyle} !important;
	`;




export {CustomDialogContent, CustomDialogActions, CustomSketchPicker}
