
let SHOW_AESOP_REDESIGN: boolean = true; // Default value

// todo make this based on environment variables in a way that is compatible with both web and native
export function shouldShowAesopRedesign(): boolean {
  // This function checks if the Aesop redesign should be shown.
  // The logic can be modified based on feature flags or other conditions.
  // For now, it returns true to indicate that the redesign should be shown.
  return SHOW_AESOP_REDESIGN;
}


export function setShowAesopRedesign(value: boolean): void {
  // This function allows setting the value of SHOW_AESOP_REDESIGN.
  // It can be used to toggle the redesign feature on or off.
  SHOW_AESOP_REDESIGN = value;
}
