// Types partagés pour les composants Timesheet
export interface TimesheetProps {
  basePath: string
  isEmployeeView: boolean
  user: any
  hasPermission: (permission: string) => boolean
  toast: any
}

export interface TimesheetData {
  timeEntries: any[]
  dailyDeclarations: any[]
  weeklyDeclarations: any[]
  budgetAlerts: any[]
  users: any[]
  departments: any[]
  tickets: any[]
  loading: boolean
  pendingValidations: {
    entries: number
    daily: number
    weekly: number
  }
}
