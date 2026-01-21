// "use client"; // Necessário para interatividade

// import Link from 'next/link';
// import { Menu, Phone, UserCircle } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { useState } from 'react';

// export function Header() {
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

//   return (
//     <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
//       <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
        
//         {/* LADO ESQUERDO: Mobile Trigger e Logo */}
//         <div className="flex items-center gap-4">
//           <Button 
//             variant="ghost" 
//             size="icon" 
//             className="md:hidden text-primary"
//             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
//           >
//             <Menu className="h-6 w-6" />
//           </Button>
          
//           <Link href="/" className="flex items-center gap-3 group">
//             {/* Logo Otimizado */}
//             <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-brand-wine-medium flex items-center justify-center shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
//               <span className="text-white font-bold text-xl">U</span>
//             </div>
//             <div className="flex flex-col leading-none">
//               <span className="text-xl font-bold text-primary tracking-tight">
//                 Uniodonto
//               </span>
//               <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
//                 Goiânia
//               </span>
//             </div>
//           </Link>
//         </div>

//         {/* CENTRO: Navegação Desktop */}
//         <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
//           {['Planos', 'Rede Credenciada', 'Dúvidas'].map((item) => (
//             <Link 
//               key={item} 
//               href={`/${item.toLowerCase().replace(' ', '-')}`}
//               className="relative py-1 hover:text-primary transition-colors after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-secondary after:transition-all hover:after:w-full"
//             >
//               {item}
//             </Link>
//           ))}
//         </nav>

//         {/* LADO DIREITO: Ações */}
//         <div className="flex items-center gap-4">
//           <div className="hidden lg:flex flex-col items-end text-right mr-2">
//             <span className="text-[10px] uppercase font-bold text-muted-foreground">Central de Vendas</span>
//             <div className="flex items-center gap-1 text-sm font-bold text-primary">
//               <Phone className="h-3 w-3" />
//               0800 123 4567
//             </div>
//           </div>

//           <Button variant="outline" size="sm" className="hidden sm:flex border-primary/20 text-primary hover:bg-primary/5">
//             <UserCircle className="h-4 w-4 mr-2" />
//             Já sou Cliente
//           </Button>
          
//           {/* Botão de Destaque Mobile */}
//           <Button size="icon" className="sm:hidden rounded-full bg-primary text-white shadow-lg">
//              <Phone className="h-4 w-4" />
//           </Button>
//         </div>
//       </div>
//     </header>
//   );
// }