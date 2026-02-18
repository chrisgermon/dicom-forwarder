# Company Directory - User Guide

The Company Directory is a comprehensive team directory feature that helps employees find and connect with colleagues across your organization.

## 📍 How to Access

**URL:** `/directory`

**Menu Location:** Found in the sidebar under "Company Directory" (visible to all users)

**Permissions Required:**
- `view_company_directory` - View the directory (granted to all users by default)
- `manage_company_directory` - Admin management features (tenant admins and super admins)

## 🌟 Key Features

### 1. **Profile Display**
Each user profile shows:
- Profile photo/avatar
- Full name
- Job title/position
- Department
- Bio/About section
- Contact information (email, phone, mobile)
- Office location

### 2. **Search & Filter**
- **Search Bar**: Search by name, email, department, or position
- **Department Filter**: Filter by specific departments
- **Sort Options**: Sort by name, department, or position
- **Real-time Results**: Instant search results as you type

### 3. **User Profile Management**
Every user can:
- Edit their own profile
- Update contact information
- Add/update profile photo
- Write a bio
- Control directory visibility

### 4. **Export Functionality**
- Export directory to CSV format
- Includes all visible users
- Perfect for org charts, contact lists, or offline reference
- Date-stamped filename

## 👤 For End Users

### Editing Your Profile

1. Navigate to `/directory`
2. Click **"Edit My Profile"** button (top right)
3. Fill in or update your information:
   - Full Name (required)
   - Position/Title
   - Department
   - Office & Mobile Phone
   - Office Location
   - Bio/About Me
   - Profile Image URL
4. Toggle "Show in Directory" to control visibility
5. Click **"Save Profile"**

**Profile Photo Tips:**
- Use a professional headshot
- Recommended size: 400x400px
- Supported formats: JPG, PNG
- Upload photo to a hosting service and paste the URL

### Finding Colleagues

1. Use the search bar to find specific people
2. Filter by department using the dropdown
3. Change sort order (by name, department, or position)
4. Click email or phone to contact directly

### Privacy Control

You can control whether you appear in the directory:
- In your profile editor, toggle "Show in Directory"
- When disabled, you won't appear in search results
- Admins can still see you in admin panels

## 👨‍💼 For Administrators

### Managing User Profiles

Admins with `manage_company_directory` permission can:

1. **View All Users** - Including hidden profiles
2. **Bulk Updates** - Update multiple profiles at once
3. **Directory Settings** - Configure directory options
4. **Audit Access** - See who's viewing the directory

### Setting Up Department Structure

1. Go to **Settings** > **Company Settings**
2. Define standard departments:
   - Engineering
   - Marketing
   - Sales
   - HR
   - Finance
   - Operations
   - etc.
3. Users will see these as options when editing profiles

### Importing Users

To bulk populate the directory:

1. **Via CSV Import**:
   - Prepare CSV with columns: name, email, department, position, phone, mobile, office_location
   - Use the import tool in admin settings
   
2. **Via Office 365 Sync**:
   - Connect Office 365 integration
   - Sync user data automatically
   - Profiles auto-populate from Azure AD

3. **Via User Invites**:
   - Send invites with pre-filled profile data
   - Users can complete their profiles on first login

## 🔧 Advanced Features

### Custom Fields

You can extend profiles with custom fields:

1. Add columns to the `profiles` table
2. Update the `UserProfileEditor` component
3. Display custom fields in directory cards

Example custom fields:
- Skills/expertise
- Certifications
- Languages spoken
- Years with company
- Reporting manager
- Team/squad

### Integration with Other Features

The directory integrates with:
- **Global Search** - Users appear in search results
- **Request Forms** - Auto-fill requestor info
- **Office 365** - Sync with Azure AD
- **Org Charts** - Visualize reporting structure
- **Team Pages** - Link to department pages

### API Access

Developers can access directory data via Supabase:

```typescript
// Fetch all visible users
const { data: users } = await supabase
  .from('profiles')
  .select('*')
  .eq('company_id', companyId)
  .eq('is_visible_in_directory', true)
  .order('name');

// Search users
const { data: results } = await supabase
  .from('profiles')
  .select('*')
  .eq('company_id', companyId)
  .eq('is_visible_in_directory', true)
  .ilike('name', `%${searchTerm}%`);
```

## 📊 Use Cases

### 1. **New Employee Onboarding**
- New hires can browse the directory
- Learn about team members
- Find who to contact for questions

### 2. **Cross-Department Collaboration**
- Find experts in other departments
- Locate project stakeholders
- Build cross-functional teams

### 3. **Remote/Distributed Teams**
- See office locations
- Find time zone information
- Connect with nearby colleagues

### 4. **Emergency Contacts**
- Quick access to phone numbers
- Export for offline reference
- Share with external vendors

### 5. **Org Chart Generation**
- Export directory data
- Create visual org charts
- Update company websites

## 🔐 Privacy & Security

- **Row Level Security (RLS)**: Users only see their company's directory
- **Visibility Control**: Users control their own visibility
- **Permission Based**: Access controlled by permissions system
- **Audit Logging**: Track directory access and changes
- **Data Privacy**: Personal data stored securely in Supabase

## 🎨 Customization

### Branding

Customize the directory appearance in your theme:
- Card colors
- Avatar styles
- Badge designs
- Layout options

### Layout Options

Choose from different display modes:
- **Grid View** (default) - Cards in responsive grid
- **List View** - Compact list format
- **Table View** - Spreadsheet-like table
- **Org Chart View** - Hierarchical tree

## 📱 Mobile Experience

The directory is fully responsive:
- Touch-friendly cards
- Swipe gestures
- Call/email with one tap
- Optimized search on mobile

## ❓ FAQ

**Q: Who can see my profile?**
A: Only users in your company who have `view_company_directory` permission.

**Q: Can I hide from the directory?**
A: Yes, toggle "Show in Directory" to off in your profile editor.

**Q: How do I update my photo?**
A: Upload your photo to any image hosting service and paste the URL in your profile.

**Q: Can I export the directory?**
A: Yes, click "Export CSV" to download all visible profiles.

**Q: How often does data sync from Office 365?**
A: If configured, O365 data syncs daily via automated cron jobs.

**Q: Can I add custom fields?**
A: Yes, admins can add custom fields to the profiles table.

## 🔄 Future Enhancements

Planned features:
- 🎯 Skills & Expertise tags
- 👥 Team/squad groupings
- 📍 Interactive office maps
- 🎂 Birthday & anniversary alerts
- 📞 Integration with phone systems
- 💬 In-app messaging
- 🌐 Multi-company directory (for groups)
- 📊 Analytics dashboard

## 📞 Support

For help with the directory:
1. Check this guide
2. Contact your company admin
3. Submit a help ticket via `/help-ticket`
4. Email support: [your-support-email]

## 🚀 Getting Started Checklist

For Admins:
- [ ] Configure departments in settings
- [ ] Import or invite users
- [ ] Set up Office 365 sync (optional)
- [ ] Customize profile fields (optional)
- [ ] Train users on profile editing

For Users:
- [ ] Visit `/directory`
- [ ] Click "Edit My Profile"
- [ ] Add your photo
- [ ] Fill in contact details
- [ ] Write a brief bio
- [ ] Save your profile
- [ ] Browse other team members

---

**Last Updated:** 2025-01-09
**Version:** 1.0.0
